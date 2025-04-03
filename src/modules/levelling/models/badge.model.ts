import { EnduranceSchema, EnduranceModelType, EnduranceDocumentType } from 'endurance-core';
import Quest from './quest.model.js';
import User from './user.model.js';

@EnduranceModelType.pre<Badge>('deleteOne', async function (this: EnduranceDocumentType<Badge>, next) {
    try {
        // Remove badgeReward from all quests that have this badge as a reward
        await Quest.updateMany(
            { badgeReward: this.id },
            { $unset: { badgeReward: "" } }
        ).exec();

        // Find all users who have this badge
        const users = await User.find({ 'badges.badge': this.id }).exec();

        // Iterate over each user and remove the badge from their badges
        for (const user of users) {
            user.badges = user.badges.filter(userBadge => userBadge.badge.toString() !== this.id.toString());
            await user.save();
        }

        next();
    } catch (error) {
        console.error('Error removing badge from quests and users:', error);
        next(undefined);
    }
})
class Badge extends EnduranceSchema {
    @EnduranceModelType.prop({
        required: true, unique: true, default: async function () {
            const lastBadge = await BadgeModel.findOne().sort({ id: -1 }).exec();
            return lastBadge ? lastBadge.id + 1 : 1;
        }
    })
    public id!: number;

    @EnduranceModelType.prop({ required: true })
    public name!: string;

    @EnduranceModelType.prop({ required: true })
    public description!: string;

    public static getModel() {
        return BadgeModel;
    }
}

const BadgeModel = EnduranceModelType.getModelForClass(Badge);
export default BadgeModel;
