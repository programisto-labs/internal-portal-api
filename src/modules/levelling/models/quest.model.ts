import { EnduranceSchema, EnduranceModelType, EnduranceDocumentType } from 'endurance-core';
import Badge from './badge.model.js';
import User from './user.model.js';
import { Types } from 'mongoose';

@EnduranceModelType.pre<Quest & { isNew: boolean }>('save', async function (this: EnduranceDocumentType<Quest> & { isNew: boolean }, next) {
    if (this.isNew) {
        const lastQuest = await QuestModel.findOne().sort({ id: -1 }).exec();
        this.id = lastQuest ? lastQuest.id + 1 : 1;
    }
    next();
})

@EnduranceModelType.pre<Quest>('deleteOne', async function (this: EnduranceDocumentType<Quest>, next) {
    try {
        const users = await User.find({ 'completedQuests.quest': this.id }).exec();
        for (const user of users) {
            user.completedQuests = user.completedQuests.filter(completedQuest => completedQuest.quest.toString() !== this.id.toString());
            await user.save();
        }
        next();
    } catch (error) {
        console.error('Error removing quest from users:', error);
        next(undefined);
    }
})

class Quest extends EnduranceSchema {
    @EnduranceModelType.prop({ required: true, unique: true })
    public id!: number;

    @EnduranceModelType.prop({ required: true })
    public name!: string;

    @EnduranceModelType.prop({ required: true })
    public description!: string;

    @EnduranceModelType.prop()
    public startDate?: Date;

    @EnduranceModelType.prop()
    public endDate?: Date;

    @EnduranceModelType.prop({ required: true })
    public xpReward!: number;

    @EnduranceModelType.prop({ ref: 'Badge' })
    public badgeReward?: Types.ObjectId;

    @EnduranceModelType.prop({ required: true, enum: ['draft', 'open', 'closed'], default: 'open' })
    public status!: string;

    @EnduranceModelType.prop({ min: 7, max: 16, default: 12 })
    public lootboxHour?: number;

    static async getTodayQuestWithLootboxHour(): Promise<Quest | null> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const quest = await QuestModel.findOne({
                startDate: { $gte: today, $lt: tomorrow },
                lootboxHour: { $exists: true }
            }).sort({ id: -1 }).exec();

            return quest;
        } catch (error) {
            console.error('Error fetching today\'s quest with lootbox hour:', error);
            throw error;
        }
    }

    public static getModel() {
        return QuestModel;
    }
}

const QuestModel = EnduranceModelType.getModelForClass(Quest);
export default QuestModel;
